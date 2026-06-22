resource "null_resource" "kubernetes" {
  triggers = {
    environment = "staging"
    component = "kubernetes"
  }
}
