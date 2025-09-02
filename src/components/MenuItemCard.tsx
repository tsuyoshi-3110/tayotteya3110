"use client";

import React, { useMemo } from "react";
import clsx from "clsx";
import {
  SwipeableList,
  SwipeableListItem,
  LeadingActions,
  TrailingActions,
  SwipeAction,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";

import { ThemeKey, THEMES } from "@/lib/themes";
import { useThemeGradient } from "@/lib/useThemeGradient";

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price?: number | null;
  isTaxIncluded?: boolean;
  order: number;
};

export default function MenuItemCard({
  item,
  onDelete,
  onEdit,
  isLoggedIn,
}: {
  item: MenuItem;
  onDelete: () => void;
  onEdit: (item: MenuItem) => void;
  isLoggedIn: boolean;
}) {
  const yen = (n: number) => n.toLocaleString("ja-JP");

  const gradient = useThemeGradient();

  // 現在のテーマがダーク系か判定
  const isDark = useMemo(() => {
    const darkThemes: ThemeKey[] = ["brandG", "brandH", "brandI"];
    if (!gradient) return false;
    return darkThemes.some((key) => gradient === THEMES[key]);
  }, [gradient]);

  const leading = () => (
    <LeadingActions>
      <SwipeAction onClick={() => onEdit(item)}>
        <div className="bg-emerald-500 text-white px-4 py-2 flex items-center justify-center whitespace-nowrap w-24 rounded-l">
          編集
        </div>
      </SwipeAction>
    </LeadingActions>
  );

  const trailing = () => (
    <TrailingActions>
      <SwipeAction onClick={onDelete}>
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center whitespace-nowrap w-24 rounded-r">
          削除
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  return (
    <SwipeableList threshold={0.25}>
      <SwipeableListItem
        leadingActions={isLoggedIn ? leading() : undefined}
        trailingActions={isLoggedIn ? trailing() : undefined}
      >
        <div
          className={clsx(
            "flex justify-between items-center py-3 px-2 rounded border-b",
            isDark ? "text-white border-white/20" : "text-black border-gray-200"
          )}
        >
          <div>
            <p className={clsx("font-medium", isDark && "text-white")}>
              {item.name}
              {item.price != null
                ? `：¥${yen(item.price)}${
                    typeof item.isTaxIncluded === "boolean"
                      ? `（${item.isTaxIncluded ? "税込" : "税別"}）`
                      : ""
                  }`
                : ""}
            </p>

            {item.description && (
              <p
                className={clsx(
                  "whitespace-pre-wrap text-sm",
                  isDark ? "text-white/70" : "text-gray-600"
                )}
              >
                {item.description}
              </p>
            )}
          </div>
        </div>
      </SwipeableListItem>
    </SwipeableList>
  );
}
