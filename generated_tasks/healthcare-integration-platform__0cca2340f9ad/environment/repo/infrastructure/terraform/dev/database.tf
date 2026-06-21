resource "null_resource" "database" {
  triggers = {
    environment = "dev"
    component = "database"
  }
}
