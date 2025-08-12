"use client";

import clsx from "clsx";
import * as RSL from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";

const SwipeableList =
  (RSL as any).SwipeableList ?? (RSL as any).default?.SwipeableList;
const SwipeableListItem =
  (RSL as any).SwipeableListItem ?? (RSL as any).default?.SwipeableListItem;
const LeadingActions =
  (RSL as any).LeadingActions ?? (RSL as any).default?.LeadingActions;
const TrailingActions =
  (RSL as any).TrailingActions ?? (RSL as any).default?.TrailingActions;
const SwipeAction =
  (RSL as any).SwipeAction ?? (RSL as any).default?.SwipeAction;

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
  const canSwipe =
    SwipeableList &&
    SwipeableListItem &&
    LeadingActions &&
    TrailingActions &&
    SwipeAction;
  const yen = (n: number) => n.toLocaleString("ja-JP");

  if (!canSwipe) {
    return (
      <div className="py-3 border-b px-2">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">
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
              <p className="whitespace-pre-wrap text-sm text-gray-500">
                {item.description}
              </p>
            )}
          </div>
          {isLoggedIn && (
            <div className="flex gap-2">
              <button className="text-emerald-600" onClick={() => onEdit(item)}>
                編集
              </button>
              <button className="text-red-600" onClick={onDelete}>
                削除
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        <div className="flex justify-between items-center py-3 border-b px-2 rounded">
          <div>
            <p className={clsx("font-medium")}>
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
              <p className="whitespace-pre-wrap text-sm text-gray-500">
                {item.description}
              </p>
            )}
          </div>
        </div>
      </SwipeableListItem>
    </SwipeableList>
  );
}
