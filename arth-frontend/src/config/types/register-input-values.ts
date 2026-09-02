import type { FormElement } from "../../components/common-form/common-form";

export const registerFormElements: FormElement[] = [
  {
    name: "firstName",
    id: "firstName",
    placeholder: "Enter your first name",
    label: "First Name",
    componentType: "input",
    type: "text"
  },
  {
    name: "lastName",
    id: "lastName",
    placeholder: "Enter your last name",
    label: "Last Name",
    componentType: "input",
    type: "text"
  },
  {
    name: "email",
    id: "email",
    placeholder: "Enter your email",
    label: "Email",
    componentType: "input",
    type: "email"
  },
  {
    name: "password",
    id: "password",
    placeholder: "Enter your password",
    label: "Password",
    componentType: "input",
    type: "password",
    autoComplete: "new-password"
  },
  {
    name: "confirmPassword",
    id: "confirmPassword",
    placeholder: "Re-enter password",
    label: "Confirm Password",
    componentType: "input",
    type: "password",
    autoComplete: "new-password"
  },
  {
    name: "dateOfBirth",
    id: "dateOfBirth",
    placeholder: "Select your date of birth",
    label: "Date of Birth",
    componentType: "input",
    type: "date"
  },
  {
    name: "phoneNumber",
    id: "phoneNumber",
    placeholder: "+919876543210",
    label: "Phone Number",
    componentType: "input",
    type: "tel"
  },
  {
    name: "nationalId",
    id: "nationalId",
    placeholder: "Enter your National ID (PAN/Aadhaar)",
    label: "National ID",
    componentType: "input",
    type: "text"
  },
  {
    name: "address",
    id: "address",
    placeholder: "Enter your full residential address",
    label: "Address",
    componentType: "input",
    type: "text"
  },
  {
    name: "accountType",
    id: "accountType",
    label: "Account Type",
    componentType: "select",
    options: [
      { id: "savings", label: "Savings Account" },
      { id: "checking", label: "Checking / Current Account" },
      { id: "salary", label: "Salary Account" }
    ]
  },
  {
    name: "branchId",
    id: "branchId",
    label: "Branch",
    componentType: "select",
    options: [
      { id: "ARTH001", label: "ARTH001 - Main Branch" }
    ]
  }
];