# ---------- Identificação ----------

variable "project_name" {
  description = "Nome do projeto, usado como prefixo dos recursos e nas tags."
  type        = string
  default     = "studyhub"
}

variable "environment" {
  description = "Ambiente da infraestrutura (dev, staging ou prod)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "O ambiente deve ser dev, staging ou prod."
  }
}

variable "aws_region" {
  description = "Região da AWS onde os recursos serão criados."
  type        = string
  default     = "us-east-1"
}

# ---------- Rede ----------

variable "vpc_cidr" {
  description = "Bloco CIDR da VPC."
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "vpc_cidr deve ser um bloco CIDR IPv4 válido."
  }
}

variable "public_subnet_cidr" {
  description = "Bloco CIDR da sub-rede pública (deve estar dentro da VPC)."
  type        = string
  default     = "10.0.1.0/24"

  validation {
    condition     = can(cidrhost(var.public_subnet_cidr, 0))
    error_message = "public_subnet_cidr deve ser um bloco CIDR IPv4 válido."
  }
}

# ---------- Segurança ----------

variable "allowed_ssh_cidrs" {
  description = "Blocos CIDR autorizados a acessar a instância por SSH (porta 22). Lista vazia desabilita o SSH."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for cidr in var.allowed_ssh_cidrs : can(cidrhost(cidr, 0))])
    error_message = "Todos os itens de allowed_ssh_cidrs devem ser blocos CIDR IPv4 válidos."
  }
}

variable "ssh_public_key" {
  description = "Conteúdo da chave pública SSH (ex.: arquivo ~/.ssh/id_ed25519.pub) usada para acessar a instância."
  type        = string
}

# ---------- Computação ----------

variable "instance_type" {
  description = "Tipo da instância EC2 que hospeda os containers."
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI da instância. Quando nulo, usa o Amazon Linux 2023 mais recente."
  type        = string
  default     = null
}

variable "root_volume_size_gb" {
  description = "Tamanho do disco raiz da instância, em GB."
  type        = number
  default     = 20

  validation {
    condition     = var.root_volume_size_gb >= 8 && var.root_volume_size_gb <= 100
    error_message = "O disco raiz deve ter entre 8 e 100 GB."
  }
}

# ---------- Aplicação ----------

variable "app_port" {
  description = "Porta em que a API fica exposta para a internet."
  type        = number
  default     = 3000

  validation {
    condition     = var.app_port >= 1 && var.app_port <= 65535
    error_message = "app_port deve estar entre 1 e 65535."
  }
}

variable "docker_compose_version" {
  description = "Versão do plugin Docker Compose instalada na instância."
  type        = string
  default     = "v5.7.1"
}
