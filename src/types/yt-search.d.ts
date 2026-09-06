// Ambient declaration for the `yt-search` package, which ships no types.
declare module 'yt-search' {
  interface YtsAuthor {
    name: string;
    url?: string;
  }
  interface YtsVideo {
    title: string;
    url: string;
    videoId: string;
    timestamp: string;
    seconds: number;
    views: number;
    ago: string;
    image: string;
    thumbnail: string;
    author: YtsAuthor;
  }
  interface YtsResult {
    videos: YtsVideo[];
    // Single-video lookup fields (when called with { videoId }):
    title: string;
    url: string;
    videoId: string;
    timestamp: string;
    seconds: number;
    views: number;
    ago: string;
    image: string;
    thumbnail: string;
    author: YtsAuthor;
  }
  function yts(query: string | { videoId: string }): Promise<YtsResult>;
  export = yts;
}
