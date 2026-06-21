resource "null_resource" "secrets" {
  triggers = {
    environment = "dev"
    component = "secrets"
  }
}
