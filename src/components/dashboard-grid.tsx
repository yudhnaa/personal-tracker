import React from "react";
import { GridLayout, useContainerWidth, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface DashboardGridProps {
	activeLayout: any;
	handleLayoutChange: (currentLayout: any, allLayouts: any) => void;
	editMode: boolean;
	children: React.ReactNode;
}

const MIN_SIZES: Record<string, { minW: number; minH: number }> = {
	todo: { minW: 4, minH: 12 },
	pomodoro: { minW: 3, minH: 8 },
	notes: { minW: 3, minH: 10 },
	bookmarks: { minW: 3, minH: 8 },
	habits: { minW: 4, minH: 8 },
};

export function DashboardGrid({ activeLayout, handleLayoutChange, editMode, children }: DashboardGridProps) {
	const { width, containerRef, mounted } = useContainerWidth();

	const layoutItems = Array.isArray(activeLayout?.lg) 
		? activeLayout.lg 
		: Array.isArray(activeLayout) ? activeLayout : [];

	const safeLayout = layoutItems.map((item: any) => ({
		...item,
		...(MIN_SIZES[item.i] || { minW: 3, minH: 8 }),
	}));

	return (
		<div className="h-full w-full" ref={containerRef}>
			{mounted && (
				<GridLayout
					className="layout"
					layout={safeLayout}
					width={width}
					gridConfig={{ cols: 12, rowHeight: 20, margin: [8, 8] as [number, number] }}
					onLayoutChange={(newLayout: Layout) => handleLayoutChange(null, { lg: newLayout })}
					dragConfig={{ enabled: editMode, handle: ".drag-handle" }}
					resizeConfig={{ enabled: editMode }}
				>
					{children}
				</GridLayout>
			)}
		</div>
	);
}
