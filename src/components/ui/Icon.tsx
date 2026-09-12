import { icons, type IconName } from "../../assets/icons";

interface IconProps {
  name: IconName;
  /** Leaf size in px, exactly as drawn in Figma. */
  size: number;
  className?: string;
}

/**
 * Renders an icon exported from Figma at its designed leaf size. The stroke
 * colour is baked into each SVG, so no recolouring happens here.
 */
export function Icon({ name, size, className }: IconProps) {
  return (
    <img
      src={icons[name]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
