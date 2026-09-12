/** The contact form's own shape, shared by the form and its confirmation. */
export interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  message: string;
}

export type FormErrors = Partial<Record<keyof FormValues, string>>;
