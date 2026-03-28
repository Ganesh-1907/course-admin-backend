import 'express-session';

declare module 'express-session' {
  interface SessionData {
    cart: {
      courseId: number;
      courseName: string;
      pricing: any;
    }[];
  }
}
