# Firewall da instância. Tudo é bloqueado por padrão; as regras abaixo
# liberam apenas o necessário. O banco de dados não é exposto: ele só é
# acessível de dentro da rede interna do Docker na própria instância.

resource "aws_security_group" "api" {
  name        = "${local.name_prefix}-api-sg"
  description = "Acesso a API do StudyHub e administracao por SSH"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-api-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "api" {
  security_group_id = aws_security_group.api.id
  description       = "API publica"
  ip_protocol       = "tcp"
  from_port         = var.app_port
  to_port           = var.app_port
  cidr_ipv4         = "0.0.0.0/0"
}

# Uma regra por bloco autorizado. Com a lista vazia, nenhuma regra de SSH é criada.
resource "aws_vpc_security_group_ingress_rule" "ssh" {
  for_each = toset(var.allowed_ssh_cidrs)

  security_group_id = aws_security_group.api.id
  description       = "SSH restrito"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = each.value
}

# Saída liberada: a instância precisa baixar pacotes e imagens Docker.
resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.api.id
  description       = "Saida para a internet"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_key_pair" "deploy" {
  key_name   = "${local.name_prefix}-deploy-key"
  public_key = var.ssh_public_key
}
