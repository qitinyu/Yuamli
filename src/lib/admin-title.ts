/**
 * 后台标题模式配置
 *
 * 控制后台（侧边栏 / 移动端顶栏）品牌区的展示：
 * - showIcon + iconUrl：显示 40×40 图标（iconUrl 为空时回退默认盾牌图标）
 * - showText + titleText：显示自定义标题文本
 * - 勾选其一显示其一，勾选二者均显示；都未勾选则品牌区留空
 */

export interface AdminTitleConfig {
  showIcon: boolean;
  showText: boolean;
  /** 图标地址：http(s) 链接或 data URL（本地选取会转成 data URL） */
  iconUrl: string;
  /** 自定义标题文本 */
  titleText: string;
}

export const DEFAULT_ADMIN_TITLE: AdminTitleConfig = {
  showIcon: true,
  showText: true,
  iconUrl: "",
  titleText: "后台管理",
};

/** 旧配置无该字段 / 字段缺失时补全为默认值 */
export function normalizeAdminTitle(
  v?: Partial<AdminTitleConfig> | null
): AdminTitleConfig {
  if (!v || typeof v !== "object") return { ...DEFAULT_ADMIN_TITLE };
  return {
    showIcon:
      typeof v.showIcon === "boolean" ? v.showIcon : DEFAULT_ADMIN_TITLE.showIcon,
    showText:
      typeof v.showText === "boolean" ? v.showText : DEFAULT_ADMIN_TITLE.showText,
    iconUrl: typeof v.iconUrl === "string" ? v.iconUrl : DEFAULT_ADMIN_TITLE.iconUrl,
    titleText:
      typeof v.titleText === "string" ? v.titleText : DEFAULT_ADMIN_TITLE.titleText,
  };
}
