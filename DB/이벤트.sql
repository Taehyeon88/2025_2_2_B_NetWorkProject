-- 임시 저장된 메세지 삭제
CREATE EVENT auto_delete
ON SCHEDULE
    EVERY 1 DAY
    START CURRENT_TIMESTAMP + INTERVAL ( 24- HOUR(CURRENT_TIMESTAMP) + 3) HOUR
    DO
    BEGIN
        DELETE FROM message_temporary
        WHERE created_at < NOW() - INTERVAL 7 DAY
    END