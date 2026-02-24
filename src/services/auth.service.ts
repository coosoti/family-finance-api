import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '../config/database';
import { env } from '../config/env';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.utils';
import { User, AuthTokens, JWTPayload } from '../types';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export const authService = {
  // Register with email + password
  async register(
    email: string,
    password: string,
    name: string,
    monthlyIncome: number = 0,
    dependents: number = 0
  ): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create user');
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        name,
        monthly_income: monthlyIncome,
        dependents,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (profileError || !profile) {
      // Rollback auth user creation
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error('Failed to create user profile');
    }

    const user: User = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      monthlyIncome: Number(profile.monthly_income),
      dependents: profile.dependents,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    };

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    return { user, tokens };
  },

  // Login with email + password
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    // Get user profile with password hash
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !profile) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      profile.password_hash || ''
    );

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    const user: User = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      monthlyIncome: Number(profile.monthly_income),
      dependents: profile.dependents,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    };

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    return { user, tokens };
  },

  // Login / Register with Google
  async googleAuth(
    idToken: string
  ): Promise<{ user: User; tokens: AuthTokens; isNew: boolean }> {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error('Invalid Google token');
    }

    const { email, name, sub: googleId } = payload;

    // Check if user exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let user: User;
    let isNew = false;

    if (existingProfile) {
      // User exists - update Google ID if needed
      user = {
        id: existingProfile.id,
        email: existingProfile.email,
        name: existingProfile.name,
        monthlyIncome: Number(existingProfile.monthly_income),
        dependents: existingProfile.dependents,
        createdAt: new Date(existingProfile.created_at),
        updatedAt: new Date(existingProfile.updated_at),
      };
    } else {
      // New user - create account
      isNew = true;

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name, googleId },
        });

      if (authError || !authData.user) {
        throw new Error('Failed to create Google user');
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email,
          name: name || email.split('@')[0],
          monthly_income: 0,
          dependents: 0,
          google_id: googleId,
        })
        .select()
        .single();

      if (profileError || !profile) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('Failed to create Google user profile');
      }

      user = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        monthlyIncome: 0,
        dependents: 0,
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      };
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    return { user, tokens, isNew };
  },

  // Refresh tokens
  async refreshTokens(
    refreshToken: string
  ): Promise<AuthTokens> {
    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!profile) {
      throw new Error('User not found');
    }

    return generateTokens({
      userId: profile.id,
      email: profile.email,
    });
  },

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      monthlyIncome: Number(profile.monthly_income),
      dependents: profile.dependents,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    };
  },

  // Update user profile
  async updateProfile(
    userId: string,
    updates: { name?: string; monthlyIncome?: number; dependents?: number }
  ): Promise<User> {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.monthlyIncome !== undefined && {
          monthly_income: updates.monthlyIncome,
        }),
        ...(updates.dependents !== undefined && {
          dependents: updates.dependents,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error || !profile) {
      throw new Error('Failed to update profile');
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      monthlyIncome: Number(profile.monthly_income),
      dependents: profile.dependents,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    };
  },

  // Reset password
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new Error('Failed to send reset email');
    }
  },
};