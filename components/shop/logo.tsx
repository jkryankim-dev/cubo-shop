import { cn } from "@/lib/utils";

interface CuboLogoProps {
  className?: string;
  /**
   * Tailwind 색상 클래스 (예: "bg-brand-pink", "bg-background", "bg-foreground", "bg-primary").
   * 기본은 `bg-primary` — primary 토큰이 라이트/다크 모두 핑크라 다크모드 자동 호환.
   * 어두운 헤더 위에선 "bg-background" 처럼 밝은 색으로 호출.
   */
  color?: string;
}

/**
 * CUBO 워드마크 로고.
 *
 * 원본 이미지는 검은 PNG (`/public/cubo-logo.png`).
 * CSS mask 로 검은 영역만 색을 입혀서 어떤 색으로든 렌더 가능.
 */
export function CuboLogo({
  className,
  color = "bg-primary",
}: CuboLogoProps) {
  return (
    <div
      role="img"
      aria-label="CUBO"
      className={cn("h-8 w-16", color, className)}
      style={{
        WebkitMaskImage: "url(/cubo-logo.png)",
        maskImage: "url(/cubo-logo.png)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
