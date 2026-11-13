provider "aws" {
  region = var.aws_region

  # Toda a infraestrutura criada recebe estas tags, o que facilita
  # identificar custos e saber o que é gerenciado por código.
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
