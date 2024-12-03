# leafer-x-snap

吸附插件，为 Leafer 应用提供元素自动吸附功能。

<img src="https://github.com/tuntun0609/leafer-x-snap/blob/master/images/demo.png?raw=true" alt="demo" style="zoom:33%;" />

## 安装

```bash
npm install leafer-x-snap
```

## 类型定义

```typescript
type SnapConfig = {
  snapSize?: number;
  lineColor?: string;
  showLine?: boolean;
};
```

## 基础使用

```typescript
import { Snap } from 'leafer-x-snap';

const app = new App({
  view: window
  editor: {}
});

const snap = new Snap(app, {
  snapSize: 5,
});

// 启用吸附功能
snap.enable(true);
```

## API 文档

### 构造函数

```typescript
constructor(app: IApp, config?: SnapConfig)
```

#### 参数

- `app`: Leafer App 实例
- `config`: 可选的配置项

#### 配置项

| 属性        | 类型    | 默认值    | 说明           |
| ----------- | ------- | --------- | -------------- |
| `snapSize`  | number  | 5         | 吸附距离范围   |
| `lineColor` | string  | '#D2D4D7' | 吸附辅助线颜色 |
| `showLine`  | boolean | true      | 是否显示辅助线 |

### 实例方法

#### enable(enable: boolean)

控制吸附功能的开启/关闭

```typescript
// 启用吸附
snap.enable(true)

// 禁用吸附
snap.enable(false)
```

#### destroy()

销毁吸附实例

```typescript
snap.destroy()
```

## 使用示例

```typescript
// 创建带配置的实例
const snap = new Snap(app, {
  snapSize: 10,
})

// 启用吸附功能
snap.enable(true)
```

## 注意事项

1. 必须传入有效的 Leafer App 实例
2. 吸附功能默认是禁用的，需要调用 `enable(true)` 来启用
3. 吸附功能会自动检测视口内的元素作为吸附参考点
4. 建议在页面元素加载完成后再初始化 Snap 实例
5. 必须安装editor插件
