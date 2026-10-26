/**
 * 单页面评论展开配置
 *
 * 后台「评论设置 → 单页面评论展开」控制前台留言区首屏的展开行为：
 * - 展开数量 count：首屏自动展开的主评论条数（all 全展开 / none 不展开 / 5 前五个）
 * - 展开深度 depth：每个评论楼里自动展开的子评论条数
 *   二级 = 2 条子评论，四级 = 4 条，六级 = 子评论全部展开
 */

export type ExpandCount = "all" | "none" | "5";
export type ExpandDepth = 2 | 4 | 6;

export interface CommentExpandConfig {
  /** 总开关：关闭时沿用历史行为（只展开第 1 条主评论 + 每个楼 1 条子评论） */
  enabled: boolean;
  count: ExpandCount;
  depth: ExpandDepth;
}

export const DEFAULT_COMMENT_EXPAND: CommentExpandConfig = {
  enabled: false,
  count: "none",
  depth: 6,
};

export const EXPAND_COUNT_OPTIONS: { value: ExpandCount; label: string }[] = [
  { value: "all", label: "全展开" },
  { value: "none", label: "不展开（默认）" },
  { value: "5", label: "前五个" },
];

export const EXPAND_DEPTH_OPTIONS: { value: ExpandDepth; label: string }[] = [
  { value: 2, label: "二级（两条子评论）" },
  { value: 4, label: "四级（四条子评论）" },
  { value: 6, label: "六级（子评论全部展开）" },
];

/** 兼容旧数据 / 缺字段 / 非法值 */
export function normalizeCommentExpand(
  raw?: Partial<CommentExpandConfig> | null
): CommentExpandConfig {
  const count: ExpandCount =
    raw?.count === "all" || raw?.count === "5" || raw?.count === "none"
      ? raw.count
      : DEFAULT_COMMENT_EXPAND.count;
  const depth: ExpandDepth =
    raw?.depth === 2 || raw?.depth === 4 || raw?.depth === 6
      ? raw.depth
      : DEFAULT_COMMENT_EXPAND.depth;
  return { enabled: !!raw?.enabled, count, depth };
}

/** 首屏展开的主评论条数；Infinity 表示全部展开 */
export function resolveExpandLimit(cfg: CommentExpandConfig): number {
  if (!cfg.enabled) return 1; // 历史行为：只展开第 1 条
  if (cfg.count === "all") return Infinity;
  if (cfg.count === "none") return 0;
  return 5;
}

/** 每个楼自动展开的子评论条数；Infinity 表示全部展开 */
export function resolveReplyLimit(cfg: CommentExpandConfig): number {
  if (!cfg.enabled) return 1; // 历史行为：只展开第 1 条子评论
  return cfg.depth === 6 ? Infinity : cfg.depth;
}
