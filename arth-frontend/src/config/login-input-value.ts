import type { FormElement } from "../components/common-form/common-form";

export const loginFormElements : FormElement[] = [
  {
  name: "customerId",
  id: "customerId",
  placeholder: "Enter your Customer ID (e.g. CUST007)",
  label: "Customer ID",
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