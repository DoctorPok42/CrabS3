import LoginForm from "./LoginForm"
import { isOidcEnabled } from "@/lib/oidc"

export default function LoginPage() {
  return <LoginForm oidcEnabled={isOidcEnabled()} />
}
