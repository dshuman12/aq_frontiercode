import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

class LoggerConfig:
    """Logger configuration class."""
    
    DEFAULT_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    DETAILED_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'

    LOG_DIR = (Path(__file__).resolve().parents[1] / "logs")
    
    @staticmethod
    def setup_logger(
        name: str,
        level: int = logging.INFO,
        log_file: Optional[str] = None,
        max_bytes: int = 10_485_760,  # 10MB
        backup_count: int = 5,
        console_output: bool = True,
        detailed_format: bool = False
    ) -> logging.Logger:
        """
        Set up a logger with specified configuration.
        
        Args:
            name: Logger name
            level: Logging level
            log_file: Optional log file path
            max_bytes: Maximum file size for rotation
            backup_count: Number of backup files to keep
            console_output: Whether to output to console
            detailed_format: Whether to use detailed format
            
        Returns:
            Configured logger instance
        """
        logger = logging.getLogger(name)
        logger.setLevel(level)
        
        # Avoid adding handlers multiple times
        if logger.handlers:
            return logger
        
        formatter = logging.Formatter(
            LoggerConfig.DETAILED_FORMAT if detailed_format else LoggerConfig.DEFAULT_FORMAT
        )
        
        # Console handler
        if console_output:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(level)
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
        
        # File handler with rotation
        if log_file:
            log_path = Path(log_file)
            file_handler = None

            try:
                # Ensure log directory exists
                log_path.parent.mkdir(parents=True, exist_ok=True)
                file_handler = RotatingFileHandler(
                    log_file,
                    maxBytes=max_bytes,
                    backupCount=backup_count,
                    encoding='utf-8'
                )
            except OSError:
                # Fall back to a writable temp directory when project log files are not writable.
                fallback_path = Path("/tmp/project_godhand_logs") / log_path.name
                try:
                    fallback_path.parent.mkdir(parents=True, exist_ok=True)
                    file_handler = RotatingFileHandler(
                        str(fallback_path),
                        maxBytes=max_bytes,
                        backupCount=backup_count,
                        encoding='utf-8'
                    )
                except OSError:
                    file_handler = None

            if file_handler is not None:
                file_handler.setLevel(level)
                file_handler.setFormatter(formatter)
                logger.addHandler(file_handler)
        
        return logger

def get_app_logger() -> logging.Logger:
    """Get the main application logger."""
    return LoggerConfig.setup_logger(
        name="app",
        level=logging.INFO,
        log_file=str(LoggerConfig.LOG_DIR / "app.log"),
        console_output=True,
        detailed_format=True
    )

def get_auth_logger() -> logging.Logger:
    """Get the authentication logger."""
    return LoggerConfig.setup_logger(
        name="auth",
        level=logging.INFO,
        log_file=str(LoggerConfig.LOG_DIR / "auth.log"),
        console_output=True,
        detailed_format=True
    )


def get_pymongo_logger() -> logging.Logger:
    """Get the pymongo logger."""
    return LoggerConfig.setup_logger(
        name="pymongo",
        level=logging.INFO,
        log_file=str(LoggerConfig.LOG_DIR / "pymongo.log"),
        console_output=True,
        detailed_format=True
    )

def get_email_logger() -> logging.Logger:
    """Get the email logger."""
    return LoggerConfig.setup_logger(
        name="email",
        level=logging.INFO,
        log_file=str(LoggerConfig.LOG_DIR / "email.log"),
        console_output=True,
        detailed_format=True
    )

