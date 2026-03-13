const BASE_URL = 'https://huaren.us/api';

export interface ForumCategory {
  Fid: number;
  Name: string;
  Description?: string;
  TopicCount?: number;
  PostCount?: number;
}

export interface Thread {
  Tid: number;
  Title: string;
  Author?: string;
  ReplyCount?: number;
  ViewCount?: number;
  LastReply?: string;
  CreateTime?: string;
}

export interface Post {
  Pid: number;
  Content: string;
  Author?: string;
  CreateTime?: string;
  Floor?: number;
}

export interface ThreadDetail {
  Tid: number;
  Title: string;
  Posts?: Post[];
}

// Helper: extract a list from various possible API response shapes
function extractList(data: any, ...keys: string[]): any[] | null {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (data && Array.isArray(data[key])) return data[key];
  }
  // Try one level deeper under 'data'
  if (data?.data) {
    if (Array.isArray(data.data)) return data.data;
    for (const key of keys) {
      if (data.data && Array.isArray(data.data[key])) return data.data[key];
    }
  }
  return null;
}

export const api = {
  async getForumList(): Promise<any> {
    const response = await fetch(`${BASE_URL}/page/index`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch forum list`);
    }
    const data = await response.json();
    console.log('[API] getForumList raw response:', JSON.stringify(data).slice(0, 500));

    const forums = extractList(
      data,
      'Forums', 'forums', 'ForumList', 'forumList', 'categories',
      'Categories', 'Boards', 'boards', 'list', 'List', 'items'
    );

    if (forums) {
      return { Forums: forums, _raw: data };
    }
    return data;
  },

  async getThreadList(fid: number, pageNumber: number = 1): Promise<any> {
    const response = await fetch(
      `${BASE_URL}/page/showForum?Fid=${fid}&PageNumber=${pageNumber}`
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch thread list`);
    }
    const data = await response.json();
    console.log('[API] getThreadList raw response:', JSON.stringify(data).slice(0, 500));

    const threads = extractList(
      data,
      'Topics', 'topics', 'Threads', 'threads', 'Posts', 'posts',
      'list', 'List', 'items', 'Items'
    );

    if (threads) {
      return { Topics: threads, _raw: data };
    }
    return data;
  },

  async getThreadDetail(tid: number): Promise<any> {
    const response = await fetch(`${BASE_URL}/page/showTopic?Tid=${tid}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch thread detail`);
    }
    const data = await response.json();
    console.log('[API] getThreadDetail raw response:', JSON.stringify(data).slice(0, 500));
    return data;
  },

  async login(username: string, password: string): Promise<any> {
    // Try form-encoded first (most classic forum APIs require this)
    const formBody = new URLSearchParams();
    formBody.append('username', username);
    formBody.append('password', password);

    console.log('[API] Attempting form-encoded login...');

    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    const text = await response.text();
    console.log('[API] login response status:', response.status);
    console.log('[API] login response body:', text.slice(0, 500));

    if (!response.ok) {
      // Fallback: try JSON
      console.log('[API] Form login failed, trying JSON...');
      const jsonResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const jsonText = await jsonResponse.text();
      console.log('[API] JSON login response status:', jsonResponse.status);
      console.log('[API] JSON login response body:', jsonText.slice(0, 500));

      if (!jsonResponse.ok) {
        throw new Error(
          `Login failed (${jsonResponse.status}). See console for API response details.`
        );
      }
      try { return JSON.parse(jsonText); } catch { return { raw: jsonText }; }
    }

    try { return JSON.parse(text); } catch { return { raw: text }; }
  },
};