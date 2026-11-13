# Servidor que executa os containers da API e do banco de dados.

# Amazon Linux 2023 mais recente, consultado apenas quando ami_id não é informado.
data "aws_ami" "amazon_linux" {
  count = var.ami_id == null ? 1 : 0

  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  ami_id = var.ami_id != null ? var.ami_id : data.aws_ami.amazon_linux[0].id
}

resource "aws_instance" "api" {
  ami                    = local.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.api.id]
  key_name               = aws_key_pair.deploy.key_name

  # Instala Docker e Docker Compose na primeira inicialização.
  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    docker_compose_version = var.docker_compose_version
    app_dir                = "/opt/${var.project_name}"
  })
  user_data_replace_on_change = true

  # IMDSv2 obrigatório: protege as credenciais da instância contra ataques SSRF.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name = "${local.name_prefix}-api"
  }

  lifecycle {
    # Uma AMI mais nova não deve recriar o servidor (e apagar o banco) por conta própria.
    ignore_changes = [ami]
  }
}

# IP fixo: o endereço da API não muda quando a instância é reiniciada.
resource "aws_eip" "api" {
  domain   = "vpc"
  instance = aws_instance.api.id

  tags = {
    Name = "${local.name_prefix}-api-eip"
  }

  depends_on = [aws_internet_gateway.main]
}
