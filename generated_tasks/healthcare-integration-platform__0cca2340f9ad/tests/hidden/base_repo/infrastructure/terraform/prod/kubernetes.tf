resource "null_resource" "kubernetes" {
  triggers = {
    environment = "prod"
    component = "kubernetes"
  }
}
