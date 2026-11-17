output "vpc_id" {
  description = "ID da VPC criada."
  value       = aws_vpc.main.id
}

output "instance_id" {
  description = "ID da instância EC2."
  value       = aws_instance.api.id
}

output "public_ip" {
  description = "IP público fixo da instância (Elastic IP)."
  value       = aws_eip.api.public_ip
}

output "api_url" {
  description = "Endereço base da API."
  value       = "http://${aws_eip.api.public_ip}:${var.app_port}"
}

output "alarm_names" {
  description = "Alarmes do CloudWatch criados para a instância."
  value = [
    aws_cloudwatch_metric_alarm.cpu_high.alarm_name,
    aws_cloudwatch_metric_alarm.status_check.alarm_name,
  ]
}

output "ssh_command" {
  description = "Comando para acessar a instância por SSH."
  value       = "ssh ec2-user@${aws_eip.api.public_ip}"
}
