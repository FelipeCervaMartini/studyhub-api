terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # O estado fica local por padrão, o que basta para um ambiente individual.
  # Para trabalho em equipe, troque por um backend remoto com bloqueio, por exemplo:
  #
  # backend "s3" {
  #   bucket       = "meu-bucket-de-estado"
  #   key          = "studyhub/terraform.tfstate"
  #   region       = "us-east-1"
  #   use_lockfile = true
  # }
}
