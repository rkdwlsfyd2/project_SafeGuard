@rem
@rem Copyright 2015-2023 the original authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem      https://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem

@if "%DEBUG%"=="" @echo off
@rem ##########################################################################
@rem
@rem  Maven startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
@rem This is normally unused
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve any "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

@rem Add default JVM options here. You can also use JAVA_OPTS and MAVEN_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:execute
@rem Setup the command line

set CLASSWORLDS_LAUNCHER=org.codehaus.plexus.classworlds.launcher.Launcher

@rem Extension to allow automatically downloading the maven-wrapper.jar from Maven-central
@rem This allows using the maven wrapper in projects that prohibit checking in binary data.
if exist %APP_HOME%\.mvn\wrapper\maven-wrapper.jar (
    set WRAPPER_JAR="%APP_HOME%\.mvn\wrapper\maven-wrapper.jar"
) else (
    for %%i in ("%APP_HOME%\.mvn\wrapper\maven-wrapper-*.jar") do (
        if not defined WRAPPER_JAR (
            set WRAPPER_JAR="%%i"
        )
    )
)

@rem Download the maven-wrapper.jar if not exists
if not exist %WRAPPER_JAR% (
    powershell -Command "(New-Object Net.WebClient).DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar', '%APP_HOME%\.mvn\wrapper\maven-wrapper.jar')"
    set WRAPPER_JAR="%APP_HOME%\.mvn\wrapper\maven-wrapper.jar"
)

set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

@rem Execute Maven
"%JAVA_EXE%" ^
  %DEFAULT_JVM_OPTS% ^
  %JAVA_OPTS% ^
  %MAVEN_OPTS% ^
  -classpath %WRAPPER_JAR% ^
  "-Dmaven.multiModuleProjectDirectory=%APP_HOME%" ^
  %WRAPPER_LAUNCHER% %*

if %ERRORLEVEL% equ 0 goto mainEnd

:fail
rem Set variable MAVEN_EXIT_CONSOLE if you need the _script_ return code instead of
rem having cmd.exe /c interpret error
set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% equ 0 set EXIT_CODE=1
if not ""=="%MAVEN_EXIT_CONSOLE%" exit %EXIT_CODE%
exit /b %EXIT_CODE%

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
