resource "null_resource" "kubernetes" {
  triggers = {
    environment = "dev"
    component = "kubernetes"
  }
}
