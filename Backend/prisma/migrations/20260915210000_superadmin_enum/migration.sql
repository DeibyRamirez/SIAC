-- AlterEnum: agregar SuperAdmin al enum RolUsuario
ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'SuperAdmin';
