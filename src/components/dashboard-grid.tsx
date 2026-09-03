import React from "react";
import { GridLayout, useContainerWidth, type Layout, type ResponsiveLayouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface DashboardGridProps {
	activeLayout: ResponsiveLayouts;
	handleLayoutChange: (allLayouts: ResponsiveLayouts) => void;
	editMode: boolean;
	layoutKey?: "lg" | "sm";
	columns?: number;
	children: React.ReactNode;
}

const MIN_SIZES: Record<string, { minW: number; minH: number }> = {
	todo: { minW: 4, minH: 12 },
	pomodoro: { minW: 3, minH: 11 },
	bookmarks: { minW: 3, minH: 8 },
	habits: { minW: 3, minH: 8 },
	subscriptions: { minW: 3, minH: 10 },
};

function minSizeFor(id: string) {
	if (id.startsWith("note:")) return { minW: 3, minH: 10 };
	return MIN_SIZES[id] || { minW: 3, minH: 8 };
}

export function DashboardGrid({
	activeLayout,
	handleLayoutChange,
	editMode,
	layoutKey = "lg",
	columns = 12,
	children,
}: DashboardGridProps) {
	const { width, containerRef, mounted } = useContainerWidth();

	const layoutItems = Array.isArray(activeLayout?.[layoutKey])
		? activeLayout[layoutKey]
		: Array.isArray(activeLayout)
			? activeLayout
			: [];

	const safeLayout: Layout = layoutItems.map((item) => {
		const minSize = minSizeFor(item.i);
		return {
			...item,
			minW: Math.min(minSize.minW, columns),
			minH: columns === 1 ? (item.minH ?? minSize.minH) : minSize.minH,
		};
	});

	return (
		<div
			className="h-full w-full"
			ref={containerRef}
		>
			{mounted && (
				<GridLayout
					className="layout"
					layout={safeLayout}
					width={width}
					gridConfig={{
						cols: columns,
						rowHeight: columns === 1 ? 10 : 20,
						margin: columns === 1 ? [0, 8] as [number, number] : [8, 8] as [number, number],
					}}
					onLayoutChange={(newLayout: Layout) => handleLayoutChange({ ...activeLayout, [layoutKey]: newLayout })}
					dragConfig={{ enabled: editMode, handle: ".drag-handle" }}
					resizeConfig={{ enabled: editMode }}
				>
					{children}
				</GridLayout>
			)}
		</div>
	);
}
