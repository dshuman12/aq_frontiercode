resource "null_resource" "secrets" {
  triggers = {
    environment = "prod"
    component = "secrets"
  }
}
