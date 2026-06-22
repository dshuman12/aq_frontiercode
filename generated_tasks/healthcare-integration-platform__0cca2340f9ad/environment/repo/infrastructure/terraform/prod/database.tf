resource "null_resource" "database" {
  triggers = {
    environment = "prod"
    component = "database"
  }
}
