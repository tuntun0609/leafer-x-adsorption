import { useEffect, useRef, useState } from 'react'
import { App as LeaferApp, Line, Rect, Text } from 'leafer-editor'
import { Snap } from 'leafer-x-snap'
import { DotMatrix } from 'leafer-x-dot-matrix'
import { Button, ColorPicker, InputNumber, Switch } from 'antd'
import { GithubOutlined } from '@ant-design/icons'

import styles from './App.module.css'
import './App.css'

const App = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const snapRef = useRef<Snap | null>(null)
  const dotMatrixRef = useRef<DotMatrix | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [snapLineColor, setSnapLineColor] = useState('#D2D4D7')
  const [snapSize, setSnapSize] = useState(10)
  const [isDash, setIsDash] = useState(false)
  const [showLinePoints, setShowLinePoints] = useState(false)

  useEffect(() => {
    if (!canvasContainerRef.current) {
      return
    }

    const app = new LeaferApp({
      view: canvasContainerRef.current,
      editor: {}, // 会自动创建 editor实例、tree层、sky层
      zoom: {
        min: 0.2,
        max: 2,
      },
    })

    app.tree.add(
      Rect.one({ editable: true, fill: '#FEB027', cornerRadius: [20, 0, 0, 20] }, 200, 100)
    )
    app.tree.add(
      Rect.one({ editable: true, fill: '#FFE04B', cornerRadius: [0, 20, 20, 0] }, 300, 300)
    )
    app.tree.add(Rect.one({ editable: true, fill: '#1abc9c', width: 500, height: 200 }, 500, 100))
    app.tree.add(
      Rect.one({ editable: true, fill: '#9b59b6', cornerRadius: [0, 20, 20, 0] }, 100, 200)
    )
    app.tree.add(
      Line.one({
        stroke: '#95a5a6',
        strokeWidth: 4,
        points: [400, 200, 450, 500],
        editable: true,
      })
    )
    app.tree.add(
      Text.one({
        text: '我设置为不可被吸附',
        fontSize: 20,
        editable: true,
        x: 600,
        y: 50,
        isSnap: false,
      })
    )

    const dotMatrix = new DotMatrix(app)
    dotMatrixRef.current = dotMatrix
    dotMatrix.enableDotMatrix(true)

    const snap = new Snap(app, {})
    snapRef.current = snap
    snap.enable(true)
    setEnabled(true)

    setSnapLineColor(snap.lineColor)
    setSnapSize(snap.snapSize)
    setIsDash(snap.isDash)
    setShowLinePoints(snap.showLinePoints)
    return () => {
      app.destroy()
    }
  }, [])

  useEffect(() => {
    if (snapRef.current) {
      snapRef.current.enable(enabled)
    }
  }, [enabled])

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button
          onClick={() => {
            setEnabled(!enabled)
          }}
        >
          {enabled ? '关闭' : '启用'}
        </Button>
        <span style={{ marginLeft: 8 }}>指示线颜色:</span>
        <ColorPicker
          value={snapLineColor}
          onChangeComplete={color => {
            const hexColor = color.toHexString()
            setSnapLineColor(hexColor)
            if (snapRef.current) {
              snapRef.current.lineColor = hexColor
            }
          }}
        />
        <span style={{ marginLeft: 8 }}>吸附范围:</span>
        <InputNumber
          value={snapSize}
          min={1}
          max={20}
          step={1}
          onChange={value => {
            if (snapRef.current && value) {
              snapRef.current.snapSize = value
              setSnapSize(value)
            }
          }}
        />
        <span style={{ marginLeft: 8 }}>是否为虚线:</span>
        <Switch
          checked={isDash}
          onChange={value => {
            if (snapRef.current) {
              snapRef.current.isDash = value
              setIsDash(value)
            }
          }}
        />
        <span style={{ marginLeft: 8 }}>展示吸附点:</span>
        <Switch
          checked={showLinePoints}
          onChange={value => {
            if (snapRef.current) {
              snapRef.current.showLinePoints = value
              setShowLinePoints(value)
            }
          }}
        />
        <div className={styles.githubIcon}>
          <Button
            style={{ padding: 0, width: 32, height: 32 }}
            type="text"
            onClick={() => {
              window.open('https://github.com/tuntun0609/leafer-x-snap', '_blank')
            }}
          >
            <GithubOutlined style={{ fontSize: 18 }} />
          </Button>
        </div>
      </div>
      <div className={styles.canvasContainer} ref={canvasContainerRef}></div>
    </div>
  )
}

export default App
