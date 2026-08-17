import type { FormElement } from "../components/common-form/common-form";

export const loginFormElements: FormElement[] = [
  {
    name: "email",
    id: "email",
    placeholder: "Enter your Email or Customer ID",
    label: "Email / Customer ID",
    componentType: "input",
    type: "text"
  },
  {
    name: "password",
    id: "password",
    placeholder: "Enter your password",
    label: "Password",
    componentType: "input",
    type: "password"
  }
];