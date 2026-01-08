import logging
from pythonjsonlogger import jsonlogger

def setup_logging():
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    handler = logging.StreamHandler()  

    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s',
        json_ensure_ascii=False
    )
    handler.setFormatter(formatter)

    root.handlers = []   # 기존 핸들러 제거
    root.addHandler(handler)