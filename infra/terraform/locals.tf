locals {
  # Prefixo comum dos nomes: studyhub-dev, studyhub-prod...
  name_prefix = "${var.project_name}-${var.environment}"
}
