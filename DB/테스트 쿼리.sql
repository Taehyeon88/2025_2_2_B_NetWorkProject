CREATE TABLE dd(
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	NAME VARCHAR(100) NOT NULL,
	passward VARCHAR(100) NOT NULL
	)

CREATE TABLE dsd(
	id INT AUTO_INCREMENT PRIMARY KEY,
	ids INT NOT null,
	hi VARCHAR(100) NULL,
	FOREIGN KEY (ids) REFERENCES dd(id)
	)
	
INSERT INTO dd (NAME, passward) VALUES
('hihello', '112233'),
('hehez', '12341'),
('ddadd', '1231')

INSERT INTO dsd (ids, hi) VALUES
(1, '집갈래'),
(2, '보내줘'),
(3, '히히 똥')

SELECT d.NAME, d.passward, ds.hi
FROM dd d 
JOIN dsd ds ON d.id = ds.ids

DROP TABLE dd

DROP TABLE users

ALTER TABLE users
MODIFY COLUMN user_id BIGINT UNSIGNED