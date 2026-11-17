# Alarmes do CloudWatch para a instância (essas métricas a AWS já coleta sozinha em toda EC2).

# Tópico de notificação. Só é criado quando um e-mail é informado em alarm_email.
resource "aws_sns_topic" "alarms" {
  count = var.alarm_email == null ? 0 : 1

  name = "${local.name_prefix}-alarmes"
}

# A AWS manda um e-mail de confirmação: o aviso só chega depois de aceitar.
resource "aws_sns_topic_subscription" "email" {
  count = var.alarm_email == null ? 0 : 1

  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

locals {
  # Sem e-mail, os alarmes existem mesmo assim e aparecem no console do CloudWatch.
  alarm_actions = var.alarm_email == null ? [] : [aws_sns_topic.alarms[0].arn]
}

# Dispara quando a CPU fica acima do limite por 10 minutos seguidos (2 períodos de 5 min).
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${local.name_prefix}-cpu-alta"
  alarm_description   = "Uso de CPU da instancia da API acima de ${var.cpu_alarm_threshold}%"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = var.cpu_alarm_threshold
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    InstanceId = aws_instance.api.id
  }
}

# Dispara quando a própria AWS detecta problema na instância (hardware, rede ou sistema travado).
resource "aws_cloudwatch_metric_alarm" "status_check" {
  alarm_name          = "${local.name_prefix}-instancia-com-falha"
  alarm_description   = "Verificacao de status da instancia da API falhou"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    InstanceId = aws_instance.api.id
  }
}
