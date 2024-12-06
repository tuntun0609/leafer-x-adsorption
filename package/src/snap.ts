import { Line, PointerEvent, LayoutEvent, Group, UI, dataType } from '@leafer-ui/core'

import { IApp, IUI } from '@leafer-ui/interface'
import { ISimulateElement } from '@leafer-in/interface'

import { EditorEvent, EditorMoveEvent } from '@leafer-in/editor'

const isArray = Array.isArray

// 是否被当做吸附对象
UI.addAttr('isSnap', true, dataType)

declare module '@leafer-ui/interface' {
  interface ILeafAttrData {
    isSnap?: boolean
  }
}

type Point = {
  x: number
  y: number
}

type BoundPoints = {
  tl: Point
  tr: Point
  bl: Point
  br: Point
  c: Point
}

type SnapConfig = {
  snapSize?: number
  lineColor?: string
  showLine?: boolean
  strokeWidth?: number
  dashPattern?: number[]
  isDash?: boolean
  showLinePoints?: boolean
  filter?: (element: IUI) => boolean
}

const DEFAULT_SNAP_SIZE = 10
const DEFAULT_LINE_COLOR = '#7F6EF6'

export class Snap {
  private app: IApp
  // 吸附点
  private snapPoints: BoundPoints[] = []
  private verticalLines: Line[] = []
  private horizontalLines: Line[] = []
  private verticalLinePoints: Group[] = []
  private horizontalLinePoints: Group[] = []

  // 吸附距离
  public snapSize: number = DEFAULT_SNAP_SIZE
  // 吸附线颜色
  public lineColor: string = DEFAULT_LINE_COLOR
  // 是否显示吸附线
  public showLine = true
  // 吸附线宽度
  public strokeWidth = 1
  // 是否虚线
  public isDash = true
  // 虚线样式
  public dashPattern: number[] = [5]
  // 是否显示吸附点
  public showLinePoints = true
  // 自定义筛选吸附元素规则
  public filter?: (element: IUI) => boolean

  constructor(app: IApp, config?: SnapConfig) {
    if (!app.isApp) {
      throw new Error('target must be an App')
    }

    if (!app.tree) {
      throw new Error('tree layer is required')
    }

    if (!app.editor) {
      throw new Error('editor is required')
    }

    this.app = app

    this.snapSize = config?.snapSize ?? this.snapSize
    this.lineColor = config?.lineColor ?? this.lineColor
    this.showLine = config?.showLine ?? this.showLine
    this.strokeWidth = config?.strokeWidth ?? this.strokeWidth
    this.isDash = config?.isDash ?? this.isDash
    this.dashPattern = config?.dashPattern ?? this.dashPattern
    this.showLinePoints = config?.showLinePoints ?? this.showLinePoints
    this.filter = config?.filter ?? this.filter

    this.handleMove = this.handleMove.bind(this)
    this.handleSelect = this.handleSelect.bind(this)
    this.clear = this.clear.bind(this)
  }

  /**
   * 主动改变筛选吸附元素函数
   */
  public changeFilter(filter: (element: IUI) => boolean) {
    this.filter = filter
  }

  /**
   * 判断两个值是否在吸附范围内
   */
  private isInRange(value1: number, value2: number) {
    return (
      Math.abs(Math.round(value1) - Math.round(value2)) <=
      this.snapSize / (this.app.zoomLayer.scaleX ?? 1)
    )
  }

  /**
   * 处理移动事件
   */
  private handleMove(event: EditorMoveEvent) {
    this.clearLines()

    const { target } = event

    const targetPoints = this.getSnapPoints(target)

    // 获取 target 的定位点
    const snapX: { offset: number; targetPoint: Point; snapPoint: Point }[] = []
    const snapY: { offset: number; targetPoint: Point; snapPoint: Point }[] = []

    // 遍历 target 的定位点与需要吸附的元素的定位点 将两者位置做比较
    Object.keys(targetPoints).forEach(key => {
      const targetPoint: Point = targetPoints[key as keyof typeof targetPoints]

      this.snapPoints.forEach(snapPoints => {
        Object.keys(snapPoints).forEach(snapPointKey => {
          const snapPoint: Point = snapPoints[snapPointKey as keyof typeof snapPoints]

          if (this.isInRange(targetPoint.x, snapPoint.x)) {
            const offset = targetPoint.x - snapPoint.x
            snapX.push({
              offset,
              targetPoint,
              snapPoint,
            })
          }

          if (this.isInRange(targetPoint.y, snapPoint.y)) {
            const offset = targetPoint.y - snapPoint.y
            snapY.push({
              offset,
              targetPoint,
              snapPoint,
            })
          }
        })
      })
    })

    /**
     * 获取吸附信息
     */
    const getSnapInfo = (snap: { offset: number; targetPoint: Point; snapPoint: Point }[]) => {
      if (snap.length === 0) {
        return null
      }

      snap.sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset))

      return snap[0]
    }

    const snapXInfo = getSnapInfo(snapX)
    const snapYInfo = getSnapInfo(snapY)
    //  x 方向可吸附
    if (snapXInfo) {
      if (this.app.editor.multiple) {
        // 多选情况下不可以只改变 target 的 x 值，需要改变所有选中元素的 x 值
        this.app.editor.list.forEach(item => {
          item.x = item.x - snapXInfo.offset
        })
        ;(target as ISimulateElement).safeChange(() => {
          target.x = target.x - snapXInfo.offset
        })
      } else {
        target.x = target.x - snapXInfo.offset
      }
    }

    if (snapYInfo) {
      if (this.app.editor.multiple) {
        // 多选情况下不可以只改变 target 的 y 值，需要改变所有选中元素的 y 值
        this.app.editor.list.forEach(item => {
          item.y = item.y - snapYInfo.offset
        })
        ;(target as ISimulateElement).safeChange(() => {
          target.y = target.y - snapYInfo.offset
        })
      } else {
        target.y = target.y - snapYInfo.offset
      }
    }

    if (!this.showLine) {
      return
    }

    // 缩放有精度问题，所以需要使用 toFixed 来判断
    const verticalLines = snapX
      .filter(item => item.offset.toFixed(2) === snapXInfo?.offset.toFixed(2))
      .map(item => [
        item.snapPoint.x,
        item.snapPoint.y,
        item.snapPoint.x,
        item.targetPoint.y - (snapYInfo?.offset ?? 0),
      ])
    const horizontalLines = snapY
      .filter(item => item.offset.toFixed(2) === snapYInfo?.offset.toFixed(2))
      .map(item => [
        item.snapPoint.x,
        item.snapPoint.y,
        item.targetPoint.x - (snapXInfo?.offset ?? 0),
        item.snapPoint.y,
      ])

    this.drawLines(verticalLines, 'y', this.lineColor)
    this.drawLines(horizontalLines, 'x', this.lineColor)
  }

  /**
   * 绘制吸附线
   */
  private drawLines(linesPoint: number[][], direction: 'x' | 'y', color = this.lineColor) {
    // 根据绘制方向的坐标分类
    const pointSet = new Set<number>()
    linesPoint.forEach(line => {
      pointSet.add(direction === 'x' ? line[1] : line[0])
    })
    const linesSet = Array.from(pointSet).map(point =>
      linesPoint.filter(line => (direction === 'x' ? line[1] === point : line[0] === point))
    )
    const points: number[][] = []
    const shouldDrawLines = linesSet.map(lines => {
      // 找出最两段的顶点
      let minPoint = Infinity
      let maxPoint = -Infinity

      lines.forEach(line => {
        points.push([line[0], line[1]], [line[2], line[3]])
        if (direction === 'x') {
          minPoint = Math.min(minPoint, line[0], line[2])
          maxPoint = Math.max(maxPoint, line[0], line[2])
        } else {
          minPoint = Math.min(minPoint, line[1], line[3])
          maxPoint = Math.max(maxPoint, line[1], line[3])
        }
      })

      const constantNum = direction === 'x' ? lines[0][1] : lines[0][0]

      if (direction === 'x') {
        return [minPoint, constantNum, maxPoint, constantNum]
      }
      return [constantNum, minPoint, constantNum, maxPoint]
    })

    if (this.showLinePoints) {
      this.drawPoints(points, direction)
    }

    const lines = this.getLines(shouldDrawLines.length, direction)
    shouldDrawLines.forEach((line, index) => {
      this.drawLine(lines[index], line, color)
    })
  }

  /**
   * 获取吸附线上的点实例，用于复用实例
   */
  private getLinePoints(points: number[][], direction: 'x' | 'y') {
    const linePoints = direction === 'x' ? this.horizontalLinePoints : this.verticalLinePoints
    const originLinePointsNum = linePoints.length
    if (points.length <= originLinePointsNum) {
      return linePoints.slice(0, points.length)
    }

    const newLinePoints = new Array(points.length - originLinePointsNum).fill(null).map(() => {
      const line1 = new Line({
        stroke: this.lineColor,
        strokeWidth: this.strokeWidth,
        points: [0, 0, 6, 6],
        className: 'point-line',
      })
      const line2 = new Line({
        stroke: this.lineColor,
        strokeWidth: this.strokeWidth,
        points: [0, 6, 6, 0],
        className: 'point-line',
      })
      const points = new Group({
        className: 'linePoint',
        children: [line1, line2],
        around: 'center',
        visible: false,
      })
      return points
    })

    linePoints.push(...newLinePoints)
    this.app.sky?.add(newLinePoints)
    return [...linePoints, ...newLinePoints]
  }

  /**
   * 绘制吸附线上的点
   */
  private drawPoints(points: number[][], direction: 'x' | 'y') {
    const linePoints = this.getLinePoints(points, direction)

    points.forEach((point, index) => {
      const worldPoint = this.app.tree?.getWorldPoint({
        x: point[0],
        y: point[1],
      })

      const points = linePoints[index]

      points.set({
        visible: true,
        x: worldPoint.x,
        y: worldPoint.y,
      })
      points.children.forEach(item => {
        item.stroke = this.lineColor
      })
      this.app.sky?.add(points)
    })
  }

  /**
   * 获取吸附线实例，用于复用吸附线的实例
   */
  private getLines(number: number, direction: 'x' | 'y') {
    const lines = direction === 'x' ? this.horizontalLines : this.verticalLines
    const originLineNum = lines.length
    if (number <= originLineNum) {
      return lines.slice(0, number)
    } else {
      const newLines = new Array(number - originLineNum).fill(null).map(
        () =>
          new Line({
            stroke: this.lineColor,
            strokeWidth: this.strokeWidth,
            className: `snap-line-${direction}`,
            visible: false,
            dashPattern: this.isDash ? this.dashPattern : undefined,
          })
      )
      lines.push(...newLines)
      this.app.sky?.add(newLines)
      return [...lines, ...newLines]
    }
  }

  /**
   * 绘制单条吸附线
   */
  private drawLine(line: Line, linePoint: number[], color = this.lineColor) {
    const firstPoint = this.app.tree?.getWorldPoint({
      x: linePoint[0],
      y: linePoint[1],
    })
    const secondPoint = this.app.tree?.getWorldPoint({
      x: linePoint[2],
      y: linePoint[3],
    })
    line.set({
      points: [firstPoint.x, firstPoint.y, secondPoint.x, secondPoint.y],
      visible: true,
      stroke: color,
      strokeWidth: this.strokeWidth,
      dashPattern: this.isDash ? this.dashPattern : undefined,
    })
  }

  /**
   * 处理选中事件
   */
  private handleSelect(event: EditorEvent) {
    const { value } = event
    // 获取视口内所有的元素
    const elements = this.getElementsInViewport().filter(item => {
      // 如果是单选 筛出自身
      if (item === value) {
        return false
      }
      // 如果是多选 筛出选中的元素
      if (isArray(value)) {
        return !value.includes(item)
      }
      // 筛出不开启吸附的元素
      if (!item.isSnap) {
        return false
      }
      // 筛出自定义规则的元素
      if (this.filter) {
        return this.filter(item)
      }
      return true
    })

    this.snapPoints = elements.map(item => this.getSnapPoints(item))
  }

  /**
   * 获取元素的吸附定位点
   */
  private getSnapPoints(_element: IUI | IUI[]): BoundPoints {
    let element: IUI[] = []
    if (Array.isArray(_element)) {
      element = [..._element]

      let maxX = -Infinity
      let maxY = -Infinity
      let minX = Infinity
      let minY = Infinity

      element.forEach(item => {
        const points = item.getLayoutPoints('box', this.app.tree)

        maxX = Math.max(maxX, ...points.map(item => item.x))
        maxY = Math.max(maxY, ...points.map(item => item.y))
        minX = Math.min(minX, ...points.map(item => item.x))
        minY = Math.min(minY, ...points.map(item => item.y))
      })

      return {
        tl: {
          x: minX,
          y: minY,
        },
        tr: {
          x: maxX,
          y: minY,
        },
        bl: {
          x: minX,
          y: maxY,
        },
        br: {
          x: maxX,
          y: maxY,
        },
        c: {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
        },
      }
    } else {
      const points = _element.getLayoutPoints('box', this.app.tree)

      const maxX = Math.max(...points.map(item => item.x))
      const maxY = Math.max(...points.map(item => item.y))
      const minX = Math.min(...points.map(item => item.x))
      const minY = Math.min(...points.map(item => item.y))

      const centerPoint: Point = {
        x: (maxX + minX) / 2,
        y: (maxY + minY) / 2,
      }

      return {
        tl: points[0],
        tr: points[1],
        bl: points[2],
        br: points[3],
        c: centerPoint,
      }
    }
  }

  /**
   * 获取视口内的元素
   */
  private getElementsInViewport() {
    // 视口范围对应的内部坐标
    const zoomLayer = this.app.zoomLayer

    const viewportBounds = [
      -zoomLayer.x,
      -zoomLayer.y,
      -zoomLayer.x + zoomLayer.width / zoomLayer.scaleX,
      -zoomLayer.y + zoomLayer.height / zoomLayer.scaleY,
    ]

    const data = this.app.tree?.find(item => {
      // 去除 Leafer 元素和 SimulateElement 元素
      if (item.isLeafer || item.tag === 'SimulateElement') {
        return 0
      }

      const itemBounds = item.getLayoutBounds('box', this.app.tree)

      if (
        itemBounds.x > viewportBounds[2] ||
        itemBounds.y > viewportBounds[3] ||
        itemBounds.x + itemBounds.width < viewportBounds[0] ||
        itemBounds.y + itemBounds.height < viewportBounds[1]
      ) {
        return 0
      }

      return 1
    })

    return data ?? []
  }

  /**
   * 隐藏吸附线
   */
  private clearLines(direction?: 'x' | 'y') {
    let lines: Line[] = []
    if (direction) {
      lines = direction === 'x' ? this.horizontalLines : this.verticalLines
    } else {
      lines = [...this.horizontalLines, ...this.verticalLines]
    }
    lines?.forEach(line => {
      line.visible = false
    })
  }

  /**
   * 清除吸附线上的点
   */
  private clearPoints(direction?: 'x' | 'y') {
    if (!direction) {
      this.horizontalLinePoints.forEach(item => {
        item.visible = false
      })
      this.verticalLinePoints.forEach(item => {
        item.visible = false
      })
      return
    }
    const linePoints = direction === 'x' ? this.horizontalLinePoints : this.verticalLinePoints
    linePoints.forEach(item => {
      item.visible = false
    })
  }

  /**
   * 清除吸附线
   */
  private clear() {
    this.clearLines()
    if (this.showLinePoints) {
      this.clearPoints()
    }
  }

  /**
   * 启用吸附
   */
  public enable(enable: boolean) {
    if (enable) {
      this.app.editor?.on(EditorEvent.SELECT, this.handleSelect)
      this.app.editor?.on(EditorMoveEvent.MOVE, this.handleMove)
      this.app.on(PointerEvent.UP, this.clear)
      this.app.tree?.on(LayoutEvent.AFTER, this.clear)

      const selectElements = this.app.editor?.list
      if (selectElements.length > 0) {
        this.handleSelect({
          value: selectElements,
        } as unknown as EditorEvent)
      }
    } else {
      this.app.editor?.off(EditorEvent.SELECT, this.handleSelect)
      this.app.editor?.off(EditorMoveEvent.MOVE, this.handleMove)
      this.app.off(PointerEvent.UP, this.clear)
      this.app.tree?.off(LayoutEvent.AFTER, this.clear)
    }
  }

  /**
   * 销毁吸附
   */
  public destroy() {
    this.app.editor?.off(EditorEvent.SELECT, this.handleSelect)
    this.app.editor?.off(EditorMoveEvent.MOVE, this.handleMove)
    this.app.off(PointerEvent.UP, this.clear)
    this.app.tree?.off(LayoutEvent.AFTER, this.clear)
    this.clear()
    this.horizontalLines.forEach(line => {
      line.destroy()
    })
    this.verticalLines.forEach(line => {
      line.destroy()
    })
    this.verticalLinePoints.forEach(item => {
      item.destroy()
    })
    this.horizontalLinePoints.forEach(item => {
      item.destroy()
    })
    this.verticalLinePoints = []
    this.horizontalLinePoints = []
    this.horizontalLines = []
    this.verticalLines = []
  }
}
