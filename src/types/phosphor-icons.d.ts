declare module "@phosphor-icons/react" {
  import { FC, SVGProps } from "react";

  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
    mirrored?: boolean;
  }

  export const SquaresFour: FC<IconProps>;
}
