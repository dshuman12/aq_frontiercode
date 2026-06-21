resource "null_resource" "secrets" {
  triggers = {
    environment = "staging"
    component = "secrets"
  }
}
