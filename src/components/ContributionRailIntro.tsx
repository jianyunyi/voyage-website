import type { ReactNode } from "react";

type ContributionRailIntroProps = {
  title: string;
  description: string;
  action: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ContributionRailIntro({
  title,
  description,
  action,
  children,
  className,
}: ContributionRailIntroProps) {
  return (
    <div
      className={`voyage-contribution-rail max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className ?? ""}`.trim()}
    >
      <div className="voyage-contribution-rail__heading flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-lg text-gray-600 max-w-3xl font-medium">{description}</p>
        </div>
        <div className="voyage-contribution-rail__action">{action}</div>
      </div>
      <div className="voyage-contribution-rail__search">{children}</div>
    </div>
  );
}
