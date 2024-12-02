import { Line, PointerEvent, LayoutEvent } from '@leafer-ui/core'

import { IApp, IUI } from '@leafer-ui/interface'

import { EditorEvent, EditorMoveEvent } from '@leafer-in/editor'

const isArray = Array.isArray

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
}

const DEFAULT_SNAP_SIZE = 10
const DEFAULT_LINE_COLOR = '#7F6EF6'

export class Snap {
  private app: IApp
  // 吸附点
  private snapPoints: BoundPoints[] = []

  // 吸附距离
  public snapSize: number = DEFAULT_SNAP_SIZE
  // 吸附线颜色
  public lineColor: string = DEFAULT_LINE_COLOR

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

    this.handleMove = this.handleMove.bind(this)
    this.handleSelect = this.handleSelect.bind(this)
    this.clear = this.clear.bind(this)
  }

  private isInRange(value1: number, value2: number) {
    return (
      Math.abs(Math.round(value1) - Math.round(value2)) <=
      this.snapSize / (this.app.zoomLayer.scaleX ?? 1)
    )
  }

  private clearLines(direction?: 'x' | 'y') {
    let lines: Line[] = []
    if (direction) {
      lines = this.app.sky?.find(`.snap-line-${direction}`) as Line[]
    } else {
      lines = [
        ...(this.app.sky?.find('.snap-line-x') as Line[]),
        ...(this.app.sky?.find('.snap-line-y') as Line[]),
      ]
    }
    lines?.forEach(line => {
      line.destroy()
    })
  }

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
      target.x = target.x - snapXInfo.offset
    }

    if (snapYInfo) {
      target.y = target.y - snapYInfo.offset
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

  private drawLines(lines: number[][], direction: 'x' | 'y', color = this.lineColor) {
    // 根据绘制方向的坐标分类
    const pointSet = new Set<number>()
    lines.forEach(line => {
      pointSet.add(direction === 'x' ? line[1] : line[0])
    })
    const linesSet = Array.from(pointSet).map(point =>
      lines.filter(line => (direction === 'x' ? line[1] === point : line[0] === point))
    )
    const shouldDrawLines = linesSet.map(lines => {
      // 找出最两段的顶点
      let minPoint = Infinity
      let maxPoint = -Infinity

      lines.forEach(line => {
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

    shouldDrawLines.forEach(line => {
      this.drawLine(line, direction, color)
    })
  }

  private drawLine(linePoint: number[], direction: 'x' | 'y', color = '#000') {
    const line = new Line({
      stroke: color,
      strokeWidth: 1,
      className: `snap-line-${direction}`,
      visible: true,
      dashPattern: [5],
    })
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
    })
    this.app.sky?.add(line)
  }

  private handleSelect(event: EditorEvent) {
    const { value } = event
    // 获取视口内所有的元素
    const elements = this.getElementsInViewport().filter(item => {
      // 筛出选中的元素
      if (isArray(value)) {
        return !value.includes(item)
      }
      return item !== value
    })

    this.snapPoints = elements.map(item => this.getSnapPoints(item))
  }

  // 获取元素的吸附定位点
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

  // 获取视口内的元素
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
      // 去除 Leafer 元素
      if (item.isLeafer) {
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

  private clear() {
    this.clearLines()
  }

  public enable(enable: boolean) {
    if (enable) {
      this.app.editor?.on(EditorEvent.SELECT, this.handleSelect)
      this.app.editor?.on(EditorMoveEvent.MOVE, this.handleMove)
      this.app.on(PointerEvent.UP, this.clear)
      this.app.tree?.on(LayoutEvent.AFTER, this.clear)
    } else {
      this.app.editor?.off(EditorEvent.SELECT, this.handleSelect)
      this.app.editor?.off(EditorMoveEvent.MOVE, this.handleMove)
      this.app.off(PointerEvent.UP, this.clear)
      this.app.tree?.off(LayoutEvent.AFTER, this.clear)
    }
  }

  public destroy() {
    this.app.editor?.off(EditorEvent.SELECT, this.handleSelect)
    this.app.editor?.off(EditorMoveEvent.MOVE, this.handleMove)
    this.app.off(PointerEvent.UP, this.clear)
    this.app.tree?.off(LayoutEvent.AFTER, this.clear)
    const xLines = this.app.sky?.find('.snap-line-x') as Line[]
    const yLines = this.app.sky?.find('.snap-line-y') as Line[]
    xLines.forEach(line => {
      line.destroy()
    })
    yLines.forEach(line => {
      line.destroy()
    })
  }
}
