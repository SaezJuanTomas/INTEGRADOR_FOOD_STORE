# app/core/unit_of_work.py — Patrón Unit of Work para manejo transaccional
from sqlmodel import Session


class UnitOfWork:
    """Maneja transacciones: commit automático al salir si no hay error, rollback si hay excepción."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def __enter__(self) -> "UnitOfWork":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is None:
            self._session.commit()
        else:
            self._session.rollback()

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()
