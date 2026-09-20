'use client';

import { create } from 'zustand';

export type OAuthType = 'github' | 'gitee' | 'gitcode' | 'qq';
export type UserType = OAuthType | 'guest';

interface CommentAuthor {
  id: string;
  name: string;
  avatar: string;
  type: UserType;
}

interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  parentId: string | null;
  replyTo: { id: string; name: string } | null;
  isPinned: boolean;
  isFeatured: boolean;
  pageId: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface SessionUser {
  id: string;
  name: string;
  avatar: string;
  type: UserType;
  email: string;
}

interface ReplyTarget {
  commentId: string;
  authorId: string;
  name: string;
}

interface CommentState {
  user: SessionUser | null;
  isAdmin: boolean;
  comments: Comment[];
  loading: boolean;
  showAuthModal: boolean;
  authModalTab: 'friends' | 'guest';
  showAdminPanel: boolean;
  /** Author id that renders with a 站长 badge (bound admin identity or legacy "admin") */
  adminAuthorId: string;
  /** IDs of top-level comments that are COLLAPSED (hidden) */
  collapsedComments: Set<string>;
  replyingTo: ReplyTarget | null;
  refreshKey: number;

  setUser: (user: SessionUser | null) => void;
  setAdmin: (val: boolean) => void;
  setComments: (comments: Comment[]) => void;
  setLoading: (val: boolean) => void;
  setShowAuthModal: (val: boolean) => void;
  setAuthModalTab: (tab: 'friends' | 'guest') => void;
  setShowAdminPanel: (val: boolean) => void;
  setAdminAuthorId: (id: string) => void;
  toggleCollapse: (id: string) => void;
  setReplyingTo: (target: ReplyTarget | null) => void;
  incrementRefresh: () => void;
  reset: () => void;
}

const initialReplyingTo: ReplyTarget | null = null;

export const useCommentStore = create<CommentState>()((set) => ({
  user: null,
  isAdmin: false,
  comments: [],
  loading: false,
  showAuthModal: false,
  authModalTab: 'friends',
  showAdminPanel: false,
  adminAuthorId: 'admin',
  collapsedComments: new Set<string>(),
  replyingTo: initialReplyingTo,
  refreshKey: 0,

  setUser: (user) => set({ user }),
  setAdmin: (val) => set({ isAdmin: val }),
  setComments: (comments) => set({ comments }),
  setLoading: (val) => set({ loading: val }),
  setShowAuthModal: (val) => set({ showAuthModal: val }),
  setAuthModalTab: (tab) => set({ authModalTab: tab }),
  setShowAdminPanel: (val) => set({ showAdminPanel: val }),
  setAdminAuthorId: (id) => set({ adminAuthorId: id }),

  toggleCollapse: (id) =>
    set((state) => {
      const next = new Set(state.collapsedComments);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { collapsedComments: next };
    }),

  setReplyingTo: (target) => set({ replyingTo: target }),
  incrementRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),

  reset: () =>
    set({
      user: null,
      isAdmin: false,
      comments: [],
      loading: false,
      showAuthModal: false,
      authModalTab: 'friends',
      showAdminPanel: false,
      adminAuthorId: 'admin',
      collapsedComments: new Set<string>(),
      replyingTo: initialReplyingTo,
      refreshKey: 0,
    }),
}));

export type { Comment, CommentAuthor, SessionUser, ReplyTarget };
