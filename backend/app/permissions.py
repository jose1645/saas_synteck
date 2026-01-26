from fastapi import Depends, HTTPException
from .auth import get_current_user
from .models import User


def require_permission(permission: str):
    def checker(user: User = Depends(get_current_user)):
        user_permissions = {
            perm.code
            for role in user.roles
            for perm in role.permissions
        }

        if permission not in user_permissions:
            raise HTTPException(status_code=403, detail="Permiso denegado")

        return user
    return checker
