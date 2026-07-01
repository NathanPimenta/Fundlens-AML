import os
import logging
import re
from contextlib import contextmanager

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor, execute_values
except ImportError as exc:
    psycopg2 = None
    RealDictCursor = None
    execute_values = None
    _PSYCOPG2_ERROR = exc
else:
    _PSYCOPG2_ERROR = None

try:
    import oracledb
except ImportError as exc:
    oracledb = None
    _ORACLEDB_ERROR = exc
else:
    _ORACLEDB_ERROR = None

logger = logging.getLogger(__name__)

# Connection URLs
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://postgres:fundlens123@localhost:5432/fundlens")
ORACLE_URL = os.getenv("ORACLE_URL", None)  # format: oracle://user:password@host:port/service_name

# Cached active database engine/dialect: "oracle", "postgres", or "sqlite"
_ACTIVE_DIALECT = None

def get_active_dialect() -> str:
    """
    Checks connection parameters ONCE and caches the active database engine.
    Uses tiny 1-second timeouts to eliminate query-time latency/fallbacks.
    """
    global _ACTIVE_DIALECT
    if _ACTIVE_DIALECT is not None:
        return _ACTIVE_DIALECT

    # 1. Check Oracle Database connection
    if ORACLE_URL and oracledb is not None:
        try:
            cleaned = ORACLE_URL.replace("oracle://", "")
            auth, rest = cleaned.split("@")
            user, password = auth.split(":")
            host_port, service_name = rest.split("/")
            host, port = host_port.split(":")
            
            # Fast test connection (timeout of 1 second)
            conn = oracledb.connect(
                user=user,
                password=password,
                host=host,
                port=int(port),
                service_name=service_name,
                expire_time=1
            )
            conn.close()
            _ACTIVE_DIALECT = "oracle"
            logger.info("Active Database Engine: ORACLE (Oracle SQL)")
            return _ACTIVE_DIALECT
        except Exception:
            pass

    # 2. Check PostgreSQL connection
    if POSTGRES_URL and psycopg2 is not None:
        try:
            # Fast test connection (timeout of 1 second)
            conn = psycopg2.connect(POSTGRES_URL, connect_timeout=1)
            conn.close()
            _ACTIVE_DIALECT = "postgres"
            logger.info("Active Database Engine: POSTGRESQL (PostgreSQL)")
            return _ACTIVE_DIALECT
        except Exception:
            pass

    # 3. Fallback to local SQLite
    _ACTIVE_DIALECT = "sqlite"
    logger.info("Active Database Engine: SQLITE (Local fallback active)")
    return _ACTIVE_DIALECT

class OracleDictCursor:
    """Wrapper to make Oracle fetch queries return dict records like Postgres RealDictCursor."""
    def __init__(self, cursor):
        self.cursor = cursor
        
    def execute(self, sql, params=None):
        formatted_sql = _format_query(sql)
        return self.cursor.execute(formatted_sql, params or ())
        
    def fetchone(self):
        row = self.cursor.fetchone()
        if not row:
            return None
        columns = [col[0].lower() for col in self.cursor.description]
        return dict(zip(columns, row))
        
    def fetchall(self):
        rows = self.cursor.fetchall()
        columns = [col[0].lower() for col in self.cursor.description]
        return [dict(zip(columns, row)) for row in rows]
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cursor.close()

def _format_query(sql: str) -> str:
    """Translates ANSI %s placeholders to Oracle :1, :2 bind parameters."""
    dialect = get_active_dialect()

    def _translate_limit_clause(query: str) -> str:
        stripped = query.strip()
        trailing_semicolon = stripped.endswith(";")
        if trailing_semicolon:
            stripped = stripped[:-1].rstrip()

        match = re.search(r"\s+LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?\s*$", stripped, re.IGNORECASE)
        if not match:
            return query

        limit_value = match.group(1)
        offset_value = match.group(2)
        prefix = stripped[: match.start()].rstrip()
        if offset_value:
            translated = f"{prefix} OFFSET {offset_value} ROWS FETCH NEXT {limit_value} ROWS ONLY"
        else:
            translated = f"{prefix} FETCH FIRST {limit_value} ROWS ONLY"

        if trailing_semicolon:
            translated += ";"
        return translated

    translated_sql = sql
    if dialect == "oracle":
        parts = translated_sql.split("%s")
        translated_sql = ""
        for idx, part in enumerate(parts[:-1]):
            translated_sql += part + f":{idx+1}"
        translated_sql += parts[-1]
        translated_sql = _translate_limit_clause(translated_sql)
    return translated_sql

def _require_oracledb():
    if oracledb is None:
        raise ImportError("oracledb is not installed") from _ORACLEDB_ERROR

def _require_psycopg2():
    if psycopg2 is None:
        raise ImportError("psycopg2 is not installed") from _PSYCOPG2_ERROR

def init_db():
    """Initialize SQL schema in either Oracle Database or PostgreSQL."""
    dialect = get_active_dialect()
    if dialect == "oracle":
        try:
            _require_oracledb()
            with get_db() as conn:
                with conn.cursor() as cur:
                    try:
                        cur.execute("""
                            CREATE TABLE accounts (
                                account_id       VARCHAR2(100) PRIMARY KEY,
                                account_type     VARCHAR2(50),
                                status           VARCHAR2(50),
                                kyc_tier         NUMBER,
                                created_date     VARCHAR2(50),
                                last_active_date VARCHAR2(50),
                                declared_income  NUMBER,
                                home_branch      VARCHAR2(100),
                                is_dormant       NUMBER(1),
                                is_pep_adjacent  NUMBER(1),
                                owner_name       VARCHAR2(100),
                                owner_type       VARCHAR2(50),
                                risk_level       VARCHAR2(50),
                                notes            CLOB
                            )
                        """)
                    except Exception:
                        pass
                    
                    try:
                        cur.execute("""
                            CREATE TABLE cases (
                                case_id          VARCHAR2(100) PRIMARY KEY,
                                typology         VARCHAR2(100),
                                typology_code    VARCHAR2(50),
                                fatf_reference   VARCHAR2(100),
                                pmla_section     VARCHAR2(100),
                                risk_score       NUMBER,
                                confidence       VARCHAR2(50),
                                risk_level       VARCHAR2(50),
                                total_amount     NUMBER,
                                accounts_count   NUMBER,
                                hops             NUMBER,
                                duration_minutes NUMBER,
                                duration_display VARCHAR2(50),
                                channel          VARCHAR2(50),
                                status           VARCHAR2(50),
                                created_at       TIMESTAMP WITH TIME ZONE,
                                gnn_score        NUMBER,
                                investigator_id  VARCHAR2(100),
                                notes            CLOB
                            )
                        """)
                    except Exception:
                        pass
                        
                    try:
                        cur.execute("""
                            CREATE TABLE transactions (
                                transaction_id   VARCHAR2(100) PRIMARY KEY,
                                sender           VARCHAR2(100),
                                receiver         VARCHAR2(100),
                                amount           NUMBER,
                                currency         VARCHAR2(10) DEFAULT 'INR',
                                timestamp        TIMESTAMP WITH TIME ZONE,
                                channel          VARCHAR2(50),
                                branch_code      VARCHAR2(50),
                                reference_number VARCHAR2(100),
                                is_fraud         NUMBER(1),
                                typology         VARCHAR2(100),
                                case_id          VARCHAR2(100),
                                demo_date        DATE
                            )
                        """)
                    except Exception:
                        pass
            logger.info("Oracle SQL Database tables validated")
            return
        except Exception as e:
            logger.warning("Failed to initialize Oracle DB tables: %s.", e)
            
    elif dialect == "postgres":
        try:
            _require_psycopg2()
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS accounts (
                            account_id       TEXT PRIMARY KEY,
                            account_type     TEXT,
                            status           TEXT,
                            kyc_tier         INTEGER,
                            created_date     TEXT,
                            last_active_date TEXT,
                            declared_income  NUMERIC,
                            home_branch      TEXT,
                            is_dormant       BOOLEAN,
                            is_pep_adjacent  BOOLEAN,
                            owner_name       TEXT,
                            owner_type       TEXT,
                            risk_level       TEXT,
                            notes            TEXT
                        );
                        
                        CREATE TABLE IF NOT EXISTS cases (
                            case_id          TEXT PRIMARY KEY,
                            typology         TEXT,
                            typology_code    TEXT,
                            fatf_reference   TEXT,
                            pmla_section     TEXT,
                            risk_score       NUMERIC,
                            confidence       TEXT,
                            risk_level       TEXT,
                            total_amount     NUMERIC,
                            accounts_count   INTEGER,
                            hops             INTEGER,
                            duration_minutes INTEGER,
                            duration_display TEXT,
                            channel          TEXT,
                            status           TEXT,
                            created_at       TIMESTAMPTZ,
                            gnn_score        NUMERIC,
                            investigator_id  TEXT,
                            notes            TEXT
                        );
                        
                        CREATE TABLE IF NOT EXISTS transactions (
                            transaction_id   TEXT PRIMARY KEY,
                            sender           TEXT,
                            receiver         TEXT,
                            amount           NUMERIC,
                            currency         TEXT DEFAULT 'INR',
                            timestamp        TIMESTAMPTZ,
                            channel          TEXT,
                            branch_code      TEXT,
                            reference_number TEXT,
                            is_fraud         BOOLEAN,
                            typology         TEXT,
                            case_id          TEXT,
                            demo_date        DATE
                        );
                    """)
                conn.commit()
                logger.info("PostgreSQL schema ready")
        except Exception as exc:
            logger.warning("PostgreSQL schema init failed: %s", exc)

@contextmanager
def get_db():
    dialect = get_active_dialect()
    if dialect == "oracle":
        _require_oracledb()
        cleaned = ORACLE_URL.replace("oracle://", "")
        auth, rest = cleaned.split("@")
        user, password = auth.split(":")
        host_port, service_name = rest.split("/")
        host, port = host_port.split(":")
        conn = oracledb.connect(
            user=user,
            password=password,
            host=host,
            port=int(port),
            service_name=service_name
        )
        try:
            yield conn
        finally:
            conn.close()
    elif dialect == "postgres":
        _require_psycopg2()
        conn = psycopg2.connect(POSTGRES_URL)
        try:
            yield conn
        finally:
            conn.close()
    else:
        raise RuntimeError("No relational database server active (SQLite local fallback active)")

@contextmanager
def get_dict_db():
    dialect = get_active_dialect()
    if dialect == "oracle":
        _require_oracledb()
        cleaned = ORACLE_URL.replace("oracle://", "")
        auth, rest = cleaned.split("@")
        user, password = auth.split(":")
        host_port, service_name = rest.split("/")
        host, port = host_port.split(":")
        conn = oracledb.connect(
            user=user,
            password=password,
            host=host,
            port=int(port),
            service_name=service_name
        )
        try:
            yield conn
        finally:
            conn.close()
    elif dialect == "postgres":
        _require_psycopg2()
        conn = psycopg2.connect(POSTGRES_URL, cursor_factory=RealDictCursor)
        try:
            yield conn
        finally:
            conn.close()
    else:
        raise RuntimeError("No relational database server active (SQLite local fallback active)")

def get_case(case_id: str):
    dialect = get_active_dialect()
    if dialect == "sqlite":
        return None
    with get_dict_db() as conn:
        cursor = conn.cursor()
        if dialect == "oracle":
            with OracleDictCursor(cursor) as cur:
                cur.execute("SELECT * FROM cases WHERE case_id = %s", (case_id,))
                return cur.fetchone()
        else:
            cursor.execute("SELECT * FROM cases WHERE case_id = %s", (case_id,))
            return cursor.fetchone()

def get_case_transactions(case_id: str):
    dialect = get_active_dialect()
    if dialect == "sqlite":
        return None
    with get_dict_db() as conn:
        cursor = conn.cursor()
        if dialect == "oracle":
            with OracleDictCursor(cursor) as cur:
                cur.execute("SELECT * FROM transactions WHERE case_id = %s ORDER BY timestamp ASC", (case_id,))
                return cur.fetchall()
        else:
            cursor.execute("SELECT * FROM transactions WHERE case_id = %s ORDER BY timestamp ASC", (case_id,))
            return cursor.fetchall()

def get_case_accounts(case_id: str):
    dialect = get_active_dialect()
    if dialect == "sqlite":
        return None
    with get_dict_db() as conn:
        cursor = conn.cursor()
        sql = """
            SELECT DISTINCT a.* FROM accounts a 
            JOIN transactions t ON a.account_id = t.sender OR a.account_id = t.receiver
            WHERE t.case_id = %s
        """
        if dialect == "oracle":
            with OracleDictCursor(cursor) as cur:
                cur.execute(sql, (case_id,))
                return cur.fetchall()
        else:
            cursor.execute(sql, (case_id,))
            return cursor.fetchall()
