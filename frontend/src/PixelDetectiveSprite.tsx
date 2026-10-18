import { useState, useEffect } from "react"

interface PixelDetectiveSpriteProps {
  className?: string
}

export function PixelDetectiveSprite({ className = "" }: PixelDetectiveSpriteProps) {
  const [isBlinking, setIsBlinking] = useState(false)

  useEffect(() => {
    // Natural human blinking interval (every 3.6 to 4.8 seconds)
    const blinkTimer = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => {
        setIsBlinking(false)
      }, 160) // 160ms realistic blink duration
    }, 4000)

    return () => clearInterval(blinkTimer)
  }, [])

  return (
    <div
      className={`pixel-detective-char-wrap ${className}`}
      aria-label="Pixel art detective character"
      role="img"
    >
      {/* Delicate hot coffee steam puffs rising from the cat mug */}
      <div className="char-mug-steam" aria-hidden="true">
        <span className="mug-steam-particle sp-1" />
        <span className="mug-steam-particle sp-2" />
        <span className="mug-steam-particle sp-3" />
      </div>

      {/* Living Detective Character: Subtle idle breathing + natural eye blinking */}
      <div className="char-idle-breathing">
        <img
          src={isBlinking ? "/images/repodetective_char_blink.png" : "/images/repodetective_char_idle.png"}
          alt="Pixel Detective"
          className="detective-exact-sprite-img"
          draggable={false}
        />
      </div>
    </div>
  )
}
