import type { ReactNode } from "react";

type Props = {
    title: string;
    /** Usually a record count — "12 orders". Rendered muted under the title. */
    subtitle?: ReactNode;
    /** Primary action(s) for the page, right-aligned. */
    action?: ReactNode;
};

/**
 * The title block every admin route opens with.
 *
 * Each page used to hand-roll this, and they had drifted: some wrapped the
 * heading in a flex row with an action button, one rendered a bare `<h2>` with
 * no wrapper at all, and only the order queue carried a record count. Same
 * markup and same spacing everywhere now, so the eye lands in the same place
 * when moving between routes.
 */
export default function AdminPageHeader({ title, subtitle, action }: Props) {
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                {subtitle != null && (
                    <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>
                )}
            </div>
            {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
    );
}
