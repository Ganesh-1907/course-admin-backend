import 'express-session';

declare module 'express-session' {
  interface SessionData {
    cart: {
      courseId: string;
      courseName: string;
      price: number;
      discountedPrice?: number;
      image?: string;
    }[];
  }
}
