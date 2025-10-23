declare module 'qrcode.react' {
  import * as React from 'react'

  export type QRLevel = 'L' | 'M' | 'Q' | 'H'

  export interface QRCodeProps {
    value: string
    size?: number
    bgColor?: string
    fgColor?: string
    level?: QRLevel
    includeMargin?: boolean
    renderAs?: 'canvas' | 'svg'
    // allow any other props passed to the underlying element
    [key: string]: any
  }

  const QRCode: React.FC<QRCodeProps>
  export default QRCode
}
