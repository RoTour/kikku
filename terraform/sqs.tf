resource "aws_sqs_queue" "spec_generation_queue" {
  name                      = "kikku-spec-generation-${var.environment}"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 86400 # 1 day
  receive_wait_time_seconds = 10    # Long polling
  
  # LLM generation can take time, so visibility timeout must be high
  visibility_timeout_seconds = 300  # 5 minutes
}

resource "aws_sqs_queue" "spec_generation_dlq" {
  name = "kikku-spec-generation-dlq-${var.environment}"
}

resource "aws_sqs_queue_redrive_policy" "spec_generation_redrive" {
  queue_url = aws_sqs_queue.spec_generation_queue.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.spec_generation_dlq.arn
    maxReceiveCount     = 3
  })
}

output "sqs_queue_url" {
  value = aws_sqs_queue.spec_generation_queue.id
}

output "sqs_queue_arn" {
  value = aws_sqs_queue.spec_generation_queue.arn
}
