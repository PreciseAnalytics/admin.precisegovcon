declare module 'naics' {
  export class Industry {
    static from(code: string): Industry | null;
    title: string;
    sector(): { title: string } | null;
  }
}